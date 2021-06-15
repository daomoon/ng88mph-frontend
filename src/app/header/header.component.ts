import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import BigNumber from 'bignumber.js';
import { AppComponent } from '../app.component';
import { ConstantsService } from '../constants.service';
import { ContractService } from '../contract.service';
import { WalletService } from '../wallet.service';
import { Watch } from '../watch';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  chainId: number;
  gasPrice: BigNumber;
  mphBalance: BigNumber;
  xMPHBalance: BigNumber;
  watchedModel = new Watch(false, "");

  constructor (
    public route: Router,
    public wallet: WalletService,
    public contract: ContractService,
    public constants: ConstantsService,
    public app: AppComponent
  ) {
    this.resetData(true, true);
  }


  ngOnInit(): void {
    this.loadData(this.wallet.connected, true);
    this.wallet.connectedEvent.subscribe(() => {
      this.resetData(true, true);
      this.loadData(true, true);
    });
    this.wallet.disconnectedEvent.subscribe(() => {
      this.resetData(true, false);
    });

    const provider = window['ethereum'] || (this.wallet.web3 && this.wallet.web3.currentProvider);
    provider.on('chainChanged', chainId => {
      this.chainId = parseInt(chainId.substring(2));
      this.wallet.changeChain(this.chainId);
      this.resetData(true, true);
      this.loadData(true, true);
    });
  }

  async loadData(loadUser: boolean, loadGlobal: boolean) {
    this.chainId = this.wallet.networkID;

    const readonlyWeb3 = this.wallet.readonlyWeb3();

    let address;
    if (this.wallet.connected && !this.wallet.watching) {
      address = this.wallet.userAddress
    } else if (this.wallet.watching) {
      address = this.wallet.watchedAddress;
    }

    if (loadUser) {
      const mphToken = await this.contract.getContract(this.constants.MPH_ADDRESS[this.chainId], 'MPHToken', readonlyWeb3);
      mphToken.methods.balanceOf(address).call().then(mphBalance => {
        this.mphBalance = new BigNumber(mphBalance).div(this.constants.PRECISION);
      });

      const xmph = await this.contract.getContract(this.constants.XMPH_ADDRESS[this.chainId], 'xMPHToken', readonlyWeb3);
      xmph.methods.balanceOf(address).call().then(xMPHBalance => {
        this.xMPHBalance = new BigNumber(xMPHBalance).div(this.constants.PRECISION);
      });
    }

    if (loadGlobal) {
      this.gasPrice = new BigNumber(await readonlyWeb3.eth.getGasPrice()).div(1e9);
    }
  }


  resetData(resetUser: boolean, resetGlobal: boolean): void {
    if (resetUser) {
      this.mphBalance = new BigNumber(0);
      this.xMPHBalance = new BigNumber(0);
    }

    if (resetGlobal) {
      this.chainId = 0;
      this.gasPrice = new BigNumber(0);
    }
  }

  connectWallet() {
    this.wallet.connect(() => { }, () => { }, false);
  }

  onSubmit() {
    this.wallet.watchWallet(this.watchedModel.address);
    this.loadData(true, true);
  }

  switchFocus(watching: boolean) {
    this.wallet.watch.watching = watching;
    this.loadData(true, true);
  }

}
